/**
 * سكريبت اختبار لفحص المنتجات وتحديد أي منها سيتم تحديثه
 * (لا يقوم بأي تغييرات على قاعدة البيانات - فقط معاينة)
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

  for (const specGroup of product.specifications) {
    if (!specGroup.items || !Array.isArray(specGroup.items)) {
      continue;
    }

    for (const item of specGroup.items) {
      if (!item.label || !item.value) continue;

      const label = item.label.toLowerCase();
      const value = item.value.toLowerCase();

      if (
        label.includes("اشتراك") ||
        label.includes("الاشتراك") ||
        label.includes("مدة") ||
        label.includes("صلاحية") ||
        label.includes("subscription") ||
        label.includes("duration") ||
        label.includes("validity")
      ) {
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
          return { found: true, label: item.label, value: item.value };
        }
      }
    }
  }

  return { found: false };
}

// دالة للتحقق من أن المنتج شريحة أو راوتر
function isSimCardOrRouter(product) {
  if (!product) return { is: false };

  const name = (product.name || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const subCategory = (product.subCategory || "").toLowerCase();

  const simKeywords = ["شريحة", "شرايح", "sim", "سيم"];
  const routerKeywords = ["راوتر", "روتر", "router"];
  const allKeywords = [...simKeywords, ...routerKeywords];

  let matchedKeyword = null;
  let matchedIn = null;

  for (const keyword of allKeywords) {
    if (name.includes(keyword)) {
      matchedKeyword = keyword;
      matchedIn = "name";
      break;
    }
    if (category.includes(keyword)) {
      matchedKeyword = keyword;
      matchedIn = "category";
      break;
    }
    if (subCategory.includes(keyword)) {
      matchedKeyword = keyword;
      matchedIn = "subCategory";
      break;
    }
  }

  return {
    is: matchedKeyword !== null,
    keyword: matchedKeyword,
    matchedIn: matchedIn,
  };
}

// معاينة المنتجات
async function previewProducts() {
  try {
    console.log("🔍 جاري فحص المنتجات...\n");

    const allProducts = await Product.find({});
    console.log(`📦 تم العثور على ${allProducts.length} منتج إجمالي\n`);

    const toBeUpdated = [];
    const toBeSkipped = [];
    const notMatching = [];

    for (const product of allProducts) {
      const matchResult = isSimCardOrRouter(product);

      if (matchResult.is) {
        const subscriptionResult = hasValidSubscription(product);

        if (subscriptionResult.found) {
          toBeSkipped.push({
            name: product.name,
            _id: product._id,
            category: product.category,
            subCategory: product.subCategory,
            matchedKeyword: matchResult.keyword,
            matchedIn: matchResult.matchedIn,
            subscriptionLabel: subscriptionResult.label,
            subscriptionValue: subscriptionResult.value,
          });
        } else {
          toBeUpdated.push({
            name: product.name,
            _id: product._id,
            category: product.category,
            subCategory: product.subCategory,
            matchedKeyword: matchResult.keyword,
            matchedIn: matchResult.matchedIn,
          });
        }
      } else {
        notMatching.push({
          name: product.name,
          _id: product._id,
          category: product.category,
          subCategory: product.subCategory,
        });
      }
    }

    console.log("=".repeat(80));
    console.log("📊 ملخص المعاينة:");
    console.log("=".repeat(80));
    console.log(`✅ منتجات ستنفذ كميتها: ${toBeUpdated.length}`);
    console.log(`⏩ منتجات ستُستثنى (لديها اشتراك سنة أو 6 أشهر): ${toBeSkipped.length}`);
    console.log(`➖ منتجات أخرى (ليست شرايح أو راوترات): ${notMatching.length}`);
    console.log(`📦 إجمالي المنتجات: ${allProducts.length}`);
    console.log("=".repeat(80) + "\n");

    if (toBeUpdated.length > 0) {
      console.log("✅ المنتجات التي سيتم تحديثها (ستنفذ الكمية):");
      console.log("-".repeat(80));
      toBeUpdated.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   الفئة: ${p.category || "غير محدد"}`);
        console.log(`   الفئة الفرعية: ${p.subCategory || "غير محدد"}`);
        console.log(`   تطابق بـ: "${p.matchedKeyword}" في ${p.matchedIn}`);
        console.log("");
      });
    }

    if (toBeSkipped.length > 0) {
      console.log("⏩ المنتجات التي سيتم استثناؤها (لديها اشتراك سنة أو 6 أشهر):");
      console.log("-".repeat(80));
      toBeSkipped.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   الفئة: ${p.category || "غير محدد"}`);
        console.log(`   الفئة الفرعية: ${p.subCategory || "غير محدد"}`);
        console.log(`   تطابق بـ: "${p.matchedKeyword}" في ${p.matchedIn}`);
        console.log(`   مدة الاشتراك: ${p.subscriptionLabel} = ${p.subscriptionValue}`);
        console.log("");
      });
    }

    console.log("✨ انتهت المعاينة - لم يتم إجراء أي تغييرات على قاعدة البيانات");
    console.log("\n💡 لتطبيق التغييرات، شغّل: npm run mark-out-of-stock");
  } catch (error) {
    console.error("❌ خطأ أثناء المعاينة:", error);
    throw error;
  }
}

// تشغيل السكريبت
async function main() {
  await connectDB();

  console.log("🎯 سكريبت معاينة المنتجات (بدون تعديلات)\n");
  console.log("=".repeat(80) + "\n");

  await previewProducts();

  await mongoose.connection.close();
  console.log("\n✅ تم إغلاق الاتصال بقاعدة البيانات");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ خطأ فادح:", error);
  process.exit(1);
});
